using UnrealBuildTool;
using System.Collections.Generic;

public class Tamale3DTarget : TargetRules
{
    public Tamale3DTarget(TargetInfo Target) : base(Target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.V5;
        IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
        ExtraModuleNames.Add("Tamale3D");
    }
}
